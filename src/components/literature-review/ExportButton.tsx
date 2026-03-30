"use client";

import Papa from "papaparse";
import type { LiteratureReviewEntry } from "@/types/literature-review";

interface ExportButtonProps {
  entries: LiteratureReviewEntry[];
}

export default function ExportButton({ entries }: ExportButtonProps) {
  function handleExport() {
    if (entries.length === 0) return;

    const rows = entries.map((e) => ({
      Source: e.source,
      "Author(s)": e.authors,
      Year: e.year,
      Page: e.page_number,
      "Highlighted Text": e.highlighted_text,
      "Theme/Category": e.theme_category,
      "My Notes": e.user_notes,
      "Date Added": new Date(e.date_added).toLocaleDateString(),
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `literature-review-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={entries.length === 0}
      className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      Export CSV
    </button>
  );
}
