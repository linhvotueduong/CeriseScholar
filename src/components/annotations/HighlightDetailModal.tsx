"use client";

import { useState } from "react";

interface HighlightDetailModalProps {
  highlightedText: string;
  noteContent: string;
  pageNumber: number;
  color: string;
  createdAt: string;
  onClose: () => void;
  onUpdateNote: (content: string) => void;
  onReHighlight: () => void;
}

export default function HighlightDetailModal({
  highlightedText,
  noteContent,
  pageNumber,
  color,
  createdAt,
  onClose,
  onUpdateNote,
  onReHighlight,
}: HighlightDetailModalProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [draft, setDraft] = useState(noteContent);

  function saveNote() {
    setEditingNote(false);
    if (draft !== noteContent) {
      onUpdateNote(draft);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-medium text-gray-600">
              Page {pageNumber}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(createdAt).toLocaleString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Highlighted text — full view */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Highlighted Text
            </label>
            <div
              className="p-4 rounded-lg text-gray-800 leading-relaxed"
              style={{ backgroundColor: color + "30" }}
            >
              <p className="text-base leading-relaxed">{highlightedText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim()}</p>
            </div>
            <button
              onClick={() => {
                onReHighlight();
                onClose();
              }}
              className="text-xs text-[#DE3163] hover:underline mt-2"
            >
              Re-highlight (select new text to replace)
            </button>
          </div>

          {/* Note — full view, editable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                My Notes
              </label>
              {!editingNote && (
                <button
                  onClick={() => setEditingNote(true)}
                  className="text-xs text-[#DE3163] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {editingNote ? (
              <div>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DE3163] focus:border-transparent resize-y text-base"
                  placeholder="Write your notes..."
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setDraft(noteContent); setEditingNote(false); }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNote}
                    className="text-xs px-3 py-1 bg-[#DE3163] text-white rounded hover:bg-[#c4294f]"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg min-h-[60px]">
                {noteContent ? (
                  <p className="text-base text-gray-700 whitespace-pre-wrap">{noteContent}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No note yet. Click &quot;Edit&quot; to add one.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
