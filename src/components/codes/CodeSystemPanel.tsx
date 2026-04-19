"use client";

import { useState } from "react";
import type { Code } from "@/types/code";

interface CodeSystemPanelProps {
  codes: Code[];
  onCreateCode: (name: string, color: string) => void;
  onUpdateCode: (id: string, fields: Partial<Pick<Code, "name" | "color">>) => void;
  onDeleteCode: (id: string) => void;
}

const PALETTE = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#1a1208", "#EC4899", "#6B7280",
  "#14B8A6", "#A855F7",
];

export default function CodeSystemPanel({
  codes,
  onCreateCode,
  onUpdateCode,
  onDeleteCode,
}: CodeSystemPanelProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function handleAdd() {
    if (!newName.trim()) return;
    onCreateCode(newName.trim(), newColor);
    setNewName("");
    setNewColor("#3B82F6");
    setAdding(false);
  }

  function startEdit(code: Code) {
    setEditingId(code.id);
    setEditName(code.name);
  }

  function saveEdit(id: string) {
    if (editName.trim()) {
      onUpdateCode(id, { name: editName.trim() });
    }
    setEditingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-[#1a1208] hover:underline"
        >
          {adding ? "Cancel" : "+ Add Code"}
        </button>
      </div>

      {/* Add new code form */}
      {adding && (
        <div className="mb-3 p-2 bg-[#fdfcfa] rounded-lg space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Code name..."
            className="w-full px-2 py-1 text-sm border border-[#d4cdc5] rounded focus:outline-none focus:ring-1 focus:ring-[#1a1208]"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <div className="flex gap-1 flex-wrap items-center">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border ${
                  newColor === c ? "border-gray-800 scale-110" : "border-[#e0d8d0]"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select ${c}`}
              />
            ))}
            {/* Custom color picker — any color */}
            <label
              className="w-5 h-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden"
              title="Pick a custom color"
              style={PALETTE.includes(newColor) ? {} : { backgroundColor: newColor }}
            >
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="opacity-0 w-5 h-5 cursor-pointer"
              />
              {PALETTE.includes(newColor) && (
                <span className="absolute text-[10px] text-[#7a6a5a] pointer-events-none">+</span>
              )}
            </label>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="text-xs px-3 py-1 bg-[#1a1208] text-white rounded hover:bg-[#000000] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {/* Code list */}
      <div className="space-y-1">
        {codes.length === 0 ? (
          <p className="text-xs text-[#9a8a7a] text-center py-2">
            No codes yet. Codes will be created automatically when you first open a PDF.
          </p>
        ) : (
          codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#fdfcfa] group"
            >
              {/* Color dot — click or pick to recolor */}
              <label
                className="w-3 h-3 rounded-full shrink-0 cursor-pointer relative ring-offset-1 hover:ring-2 hover:ring-gray-300"
                style={{ backgroundColor: code.color }}
                title="Click to change color"
              >
                <input
                  type="color"
                  value={code.color}
                  onChange={(e) => onUpdateCode(code.id, { color: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label={`Change color for ${code.name}`}
                />
              </label>

              {/* Name — editable on click */}
              {editingId === code.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveEdit(code.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(code.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 px-1 py-0 text-sm border border-[#1a1208] rounded focus:outline-none"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => startEdit(code)}
                  className="flex-1 text-sm text-[#5a4a3a] cursor-pointer"
                  title="Click to rename"
                >
                  {code.name}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => onDeleteCode(code.id)}
                className="text-xs text-[#d4cdc5] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete code"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
