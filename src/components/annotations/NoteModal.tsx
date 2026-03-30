"use client";

import { useState } from "react";

interface NoteModalProps {
  onSave: (content: string) => void;
  onClose: () => void;
}

export default function NoteModal({ onSave, onClose }: NoteModalProps) {
  const [content, setContent] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (content.trim()) {
      onSave(content.trim());
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Add a Note</h3>
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note or comment here..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DE3163] focus:border-transparent resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!content.trim()}
            className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f] disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </form>
    </div>
  );
}
