"use client";

import { useState, useRef, useEffect } from "react";
import type { LiteratureReviewEntry } from "@/types/literature-review";

interface ReviewTableRowProps {
  entry: LiteratureReviewEntry;
  onUpdate: (
    id: string,
    fields: Partial<
      Pick<
        LiteratureReviewEntry,
        "authors" | "year" | "theme_category" | "user_notes" | "code_name" | "apa_reference" | "synthesis_paragraph"
      >
    >
  ) => void;
  onDelete: (id: string) => void;
}

function EditableCell({
  value,
  field,
  entryId,
  onUpdate,
  multiline = false,
  placeholder = "Click to edit",
}: {
  value: string;
  field: "authors" | "year" | "theme_category" | "user_notes" | "code_name" | "apa_reference" | "synthesis_paragraph";
  entryId: string;
  onUpdate: ReviewTableRowProps["onUpdate"];
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function save() {
    setEditing(false);
    if (draft !== value) {
      onUpdate(entryId, { [field]: draft });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !multiline) save();
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  }

  if (editing) {
    const cls = "w-full px-2 py-1 text-sm border border-[#111111] rounded focus:outline-none";
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        rows={4}
        className={cls + " resize-y"}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={cls}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="block w-full px-2 py-1 text-sm cursor-pointer rounded hover:bg-pink-50 min-h-[28px] whitespace-pre-wrap"
      title="Click to edit"
    >
      {value || <span className="text-gray-300 italic">{placeholder}</span>}
    </span>
  );
}

export default function ReviewTableRow({ entry, onUpdate, onDelete }: ReviewTableRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
      {/* A: Document Name (source) — read-only, links to PDF */}
      <td className="px-3 py-2 text-sm text-gray-800 min-w-[140px]">
        <a
          href={`/dashboard/viewer/${entry.pdf_id}`}
          className="text-[#111111] hover:underline"
          title={entry.source}
        >
          {entry.source}
        </a>
        {entry.authors && (
          <p className="text-[11px] text-gray-400 mt-0.5">{entry.authors}{entry.year ? `, ${entry.year}` : ""}</p>
        )}
      </td>

      {/* APA Reference — editable */}
      <td className="px-1 py-1 min-w-[160px] max-w-[250px]">
        <EditableCell
          value={entry.apa_reference}
          field="apa_reference"
          entryId={entry.id}
          onUpdate={onUpdate}
          multiline
          placeholder="Paste APA reference..."
        />
      </td>

      {/* B: Code / Section — editable */}
      <td className="px-1 py-1 min-w-[120px]">
        <EditableCell
          value={entry.code_name}
          field="code_name"
          entryId={entry.id}
          onUpdate={onUpdate}
          placeholder="Assign section..."
        />
        {entry.theme_category && (
          <span className="text-[10px] text-gray-400 px-2 block mt-0.5">
            {entry.theme_category}
          </span>
        )}
      </td>

      {/* C: Quotes from sources (highlighted text) — read-only */}
      <td className="px-3 py-2 text-sm text-gray-700 min-w-[200px] max-w-[350px]">
        <p className="leading-relaxed">
          {entry.highlighted_text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim()}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          p. {entry.page_number}
        </p>
      </td>

      {/* D: My analytical insights / notes — editable */}
      <td className="px-1 py-1 min-w-[200px] max-w-[350px]">
        <EditableCell
          value={entry.user_notes}
          field="user_notes"
          entryId={entry.id}
          onUpdate={onUpdate}
          multiline
          placeholder="Write your analysis..."
        />
      </td>

      {/* E: Synthesis paragraph — editable */}
      <td className="px-1 py-1 min-w-[200px] max-w-[400px]">
        <EditableCell
          value={entry.synthesis_paragraph}
          field="synthesis_paragraph"
          entryId={entry.id}
          onUpdate={onUpdate}
          multiline
          placeholder="Write synthesis..."
        />
      </td>

      {/* Delete */}
      <td className="px-2 py-2 w-[30px]">
        <button
          onClick={() => onDelete(entry.id)}
          className="text-gray-300 hover:text-red-500 text-sm"
          title="Delete entry"
        >
          &times;
        </button>
      </td>
    </tr>
  );
}
