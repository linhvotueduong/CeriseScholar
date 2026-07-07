"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { readApiResponse } from "@/lib/utils/readApiResponse";
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
    const cls = "w-full px-2 py-1 text-sm border border-[#1a1208] rounded focus:outline-none";
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
      {value || <span className="text-[#d4cdc5] italic">{placeholder}</span>}
    </span>
  );
}

// APA Reference cell — same editable text cell as the rest of the row, plus a
// small "Generate" button (visible on hover, or always when the cell is empty)
// that calls /api/ai's generate_apa task and writes the result through the
// same onUpdate path as a manual edit (so it persists + logs literature_row_saved).
function ApaReferenceCell({
  entry,
  onUpdate,
}: {
  entry: LiteratureReviewEntry;
  onUpdate: ReviewTableRowProps["onUpdate"];
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data: pdf, error: pdfErr } = await supabase
        .from("pdfs")
        .select("filename, ocr_text, ocr_status")
        .eq("id", entry.pdf_id)
        .single();

      if (pdfErr || !pdf) {
        setError("Couldn't load the source PDF.");
        return;
      }
      if (!pdf.ocr_text) {
        setError(
          pdf.ocr_status === "failed"
            ? "Text extraction failed for this PDF — retry OCR from the Workspace panel."
            : "Still extracting text from this PDF — try again shortly."
        );
        return;
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "generate_apa",
          pdfText: pdf.ocr_text,
          filename: pdf.filename,
        }),
      });
      const data = await readApiResponse<{ apa?: string; error?: string }>(res);

      if (!res.ok || data.error) {
        setError(data.error || "Couldn't generate a citation. Try again.");
        return;
      }
      if (!data.apa) {
        setError("Couldn't generate a citation. Try again.");
        return;
      }

      onUpdate(entry.id, { apa_reference: data.apa });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="group relative">
      <EditableCell
        value={entry.apa_reference}
        field="apa_reference"
        entryId={entry.id}
        onUpdate={onUpdate}
        multiline
        placeholder="Paste APA reference..."
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        title="Generate an APA reference from this PDF's extracted text"
        className={`absolute top-0.5 right-0.5 rounded border border-[#e0cdb8] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#8f6132] hover:bg-[#f6efe4] disabled:opacity-60 transition-opacity ${
          entry.apa_reference ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        {generating ? "Generating…" : "Generate"}
      </button>
      {error && (
        <p className="px-2 pb-1 text-[10px] text-red-500 leading-snug">{error}</p>
      )}
    </div>
  );
}

export default function ReviewTableRow({ entry, onUpdate, onDelete }: ReviewTableRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-[#fdfcfa] align-top">
      {/* A: Document Name (source) — read-only, links to PDF */}
      <td className="px-3 py-2 text-sm text-[#1a1208] min-w-[140px]">
        <a
          href={`/dashboard/viewer/${entry.pdf_id}`}
          className="text-[#1a1208] hover:underline"
          title={entry.source}
        >
          {entry.source}
        </a>
        {entry.authors && (
          <p className="text-[11px] text-[#9a8a7a] mt-0.5">{entry.authors}{entry.year ? `, ${entry.year}` : ""}</p>
        )}
      </td>

      {/* APA Reference — editable, with an AI "Generate" helper */}
      <td className="px-1 py-1 min-w-[160px] max-w-[250px]">
        <ApaReferenceCell entry={entry} onUpdate={onUpdate} />
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
          <span className="text-[10px] text-[#9a8a7a] px-2 block mt-0.5">
            {entry.theme_category}
          </span>
        )}
      </td>

      {/* C: Quotes from sources (highlighted text) — read-only */}
      <td className="px-3 py-2 text-sm text-[#5a4a3a] min-w-[200px] max-w-[350px]">
        <p className="leading-relaxed">
          {entry.highlighted_text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim()}
        </p>
        <p className="text-[10px] text-[#9a8a7a] mt-1">
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
          className="text-[#d4cdc5] hover:text-red-500 text-sm"
          title="Delete entry"
        >
          &times;
        </button>
      </td>
    </tr>
  );
}
