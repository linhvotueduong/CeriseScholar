"use client";

import { useState } from "react";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#FFD700" },
  { name: "Cerise", value: "#DE3163" },
  { name: "Green", value: "#77DD77" },
  { name: "Blue", value: "#89CFF0" },
  { name: "Orange", value: "#FFB347" },
  { name: "Purple", value: "#B19CD9" },
];

interface NoteModalProps {
  onSave: (content: string, color?: string) => void;
  onClose: () => void;
  highlightText?: string;
  showColorPicker?: boolean;
  defaultColor?: string;
}

export default function NoteModal({
  onSave,
  onClose,
  highlightText,
  showColorPicker = false,
  defaultColor = "#FFD700",
}: NoteModalProps) {
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColor);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(content.trim(), showColorPicker ? selectedColor : undefined);
  }

  function handleSkip() {
    // Save with no note but still pass the color
    onSave("", showColorPicker ? selectedColor : undefined);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Add a Note
        </h3>

        {highlightText && (
          <p className="text-sm text-gray-500 mb-3 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400 line-clamp-3">
            &ldquo;{highlightText}&rdquo;
          </p>
        )}

        {/* Color picker */}
        {showColorPicker && (
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">
              Highlight color:
            </label>
            <div className="flex gap-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? "border-gray-800 scale-110"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note or comment about this highlight... (optional)"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DE3163] focus:border-transparent resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {content.trim() ? "Cancel" : "Skip Note"}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-[#DE3163] text-white rounded-lg hover:bg-[#c4294f]"
          >
            Save Note
          </button>
        </div>
      </form>
    </div>
  );
}
