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
        "authors" | "year" | "theme_category" | "user_notes"
      >
    >
  ) => void;
  onDelete: (id: string) => void;
}

// An inline-editable cell: click to edit, blur or Enter to save
function EditableCell({
  value,
  field,
  entryId,
  onUpdate,
  multiline = false,
}: {
  value: string;
  field: "authors" | "year" | "theme_category" | "user_notes";
  entryId: string;
  onUpdate: ReviewTableRowProps["onUpdate"];
  multiline?: boolean;
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
    if (e.key === "Enter" && !multiline) {
      save();
    }
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing) {
    const className =
      "w-full px-2 py-1 text-sm border border-[#DE3163] rounded focus:outline-none";

    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        rows={3}
        className={className + " resize-none"}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="block w-full px-2 py-1 text-sm cursor-pointer rounded hover:bg-pink-50 min-h-[28px]"
      title="Click to edit"
    >
      {value || (
        <span className="text-gray-300 italic">Click to edit</span>
      )}
    </span>
  );
}

export default function ReviewTableRow({
  entry,
  onUpdate,
  onDelete,
}: ReviewTableRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {/* Source (read-only, links to PDF) */}
      <td className="px-3 py-2 text-sm text-gray-800 max-w-[150px]">
        <a
          href={`/dashboard/viewer/${entry.pdf_id}`}
          className="text-[#DE3163] hover:underline truncate block"
          title={entry.source}
        >
          {entry.source}
        </a>
      </td>

      {/* Author(s) — editable */}
      <td className="px-1 py-1 max-w-[120px]">
        <EditableCell
          value={entry.authors}
          field="authors"
          entryId={entry.id}
          onUpdate={onUpdate}
        />
      </td>

      {/* Year — editable */}
      <td className="px-1 py-1 w-[70px]">
        <EditableCell
          value={entry.year}
          field="year"
          entryId={entry.id}
          onUpdate={onUpdate}
        />
      </td>

      {/* Page # (read-only) */}
      <td className="px-3 py-2 text-sm text-gray-600 text-center w-[50px]">
        {entry.page_number}
      </td>

      {/* Highlighted Text (read-only) */}
      <td className="px-3 py-2 text-sm text-gray-700 max-w-[250px]">
        <p className="line-clamp-3" title={entry.highlighted_text}>
          &ldquo;{entry.highlighted_text}&rdquo;
        </p>
      </td>

      {/* Theme/Category — editable */}
      <td className="px-1 py-1 max-w-[120px]">
        <EditableCell
          value={entry.theme_category}
          field="theme_category"
          entryId={entry.id}
          onUpdate={onUpdate}
        />
      </td>

      {/* My Notes — editable (multiline) */}
      <td className="px-1 py-1 max-w-[200px]">
        <EditableCell
          value={entry.user_notes}
          field="user_notes"
          entryId={entry.id}
          onUpdate={onUpdate}
          multiline
        />
      </td>

      {/* Date Added (read-only) */}
      <td className="px-3 py-2 text-xs text-gray-400 w-[90px]">
        {new Date(entry.date_added).toLocaleDateString()}
      </td>

      {/* Delete */}
      <td className="px-2 py-2 w-[40px]">
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
