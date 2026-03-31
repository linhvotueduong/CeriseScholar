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
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
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
          className="text-xs text-[#DE3163] hover:underline"
        >
          {adding ? "Cancel" : "+ Add Code"}
        </button>
      </div>

      {/* Add new code form */}
      {adding && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Code name..."
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#DE3163]"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border ${
                  newColor === c ? "border-gray-800 scale-110" : "border-gray-200"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="text-xs px-3 py-1 bg-[#DE3163] text-white rounded hover:bg-[#c4294f] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {/* Code list */}
      <div className="space-y-1">
        {codes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            No codes yet. Codes will be created automatically when you first open a PDF.
          </p>
        ) : (
          codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 group"
            >
              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: code.color }}
              />

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
                  className="flex-1 px-1 py-0 text-sm border border-[#DE3163] rounded focus:outline-none"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => startEdit(code)}
                  className="flex-1 text-sm text-gray-700 cursor-pointer"
                  title="Click to rename"
                >
                  {code.name}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => onDeleteCode(code.id)}
                className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
