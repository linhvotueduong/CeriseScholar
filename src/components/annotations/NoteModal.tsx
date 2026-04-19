"use client";

import { useState } from "react";
import type { Code } from "@/types/code";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#FFD700" },
  { name: "Cerise", value: "#1a1208" },
  { name: "Green", value: "#77DD77" },
  { name: "Blue", value: "#89CFF0" },
  { name: "Orange", value: "#FFB347" },
  { name: "Purple", value: "#B19CD9" },
];

interface NoteModalProps {
  onSave: (content: string, color?: string, codeId?: string, codeName?: string) => void;
  onClose: () => void;
  highlightText?: string;
  showColorPicker?: boolean;
  showCodeSelector?: boolean;
  codes?: Code[];
  defaultColor?: string;
}

export default function NoteModal({
  onSave,
  onClose,
  highlightText,
  showColorPicker = false,
  showCodeSelector = false,
  codes = [],
  defaultColor = "#FFD700",
}: NoteModalProps) {
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedCodeId, setSelectedCodeId] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = codes.find((c) => c.id === selectedCodeId);
    onSave(
      content.trim(),
      showColorPicker ? selectedColor : undefined,
      selectedCodeId || undefined,
      code?.name || undefined
    );
  }

  function handleSkip() {
    const code = codes.find((c) => c.id === selectedCodeId);
    onSave(
      "",
      showColorPicker ? selectedColor : undefined,
      selectedCodeId || undefined,
      code?.name || undefined
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold text-[#1a1208] mb-1">
          Add a Note
        </h3>

        {highlightText && (
          <p className="text-sm text-[#7a6a5a] mb-3 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400 line-clamp-3">
            &ldquo;{highlightText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim()}&rdquo;
          </p>
        )}

        {/* Color picker */}
        {showColorPicker && (
          <div className="mb-3">
            <label className="text-xs text-[#7a6a5a] mb-1 block">
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
                      : "border-[#e0d8d0] hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Code/Section selector */}
        {showCodeSelector && codes.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-[#7a6a5a] mb-1 block">
              Assign to paper section:
            </label>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCodeId("")}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  selectedCodeId === ""
                    ? "border-gray-800 bg-[#faf7f0] font-medium"
                    : "border-[#e0d8d0] text-[#7a6a5a] hover:border-gray-400"
                }`}
              >
                None
              </button>
              {codes.map((code) => (
                <button
                  key={code.id}
                  type="button"
                  onClick={() => setSelectedCodeId(code.id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1 ${
                    selectedCodeId === code.id
                      ? "border-gray-800 font-medium"
                      : "border-[#e0d8d0] text-[#7a6a5a] hover:border-gray-400"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: code.color }}
                  />
                  {code.name}
                </button>
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
          className="w-full px-3 py-2 border border-[#d4cdc5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1208] focus:border-transparent resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-[#7a6a5a] hover:text-[#1a1208]"
          >
            {content.trim() ? "Cancel" : "Skip Note"}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-[#1a1208] text-white rounded-lg hover:bg-[#000000]"
          >
            Save Note
          </button>
        </div>
      </form>
    </div>
  );
}
