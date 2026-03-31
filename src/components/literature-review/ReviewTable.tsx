"use client";

import type { LiteratureReviewEntry } from "@/types/literature-review";
import ReviewTableRow from "./ReviewTableRow";

interface ReviewTableProps {
  entries: LiteratureReviewEntry[];
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

export default function ReviewTable({ entries, onUpdate, onDelete }: ReviewTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500 text-lg">No entries yet</p>
        <p className="text-gray-400 mt-1">
          Highlight text in a PDF to automatically add entries here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
              Document Name
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
              APA Reference
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
              Section / Code
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
              Quotes from Sources
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
              My Insights / Notes
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
              Synthesis Paragraph
            </th>
            <th className="px-3 py-3 w-[30px]"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <ReviewTableRow
              key={entry.id}
              entry={entry}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
