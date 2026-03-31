"use client";

import Link from "next/link";
import OcrStatusBadge from "@/components/ocr/OcrStatusBadge";
import { runOcr } from "@/lib/ocr/runOcr";
import type { Pdf } from "@/types/pdf";

export default function PdfCard({ pdf }: { pdf: Pdf }) {
  function handleRunOcr(e: React.MouseEvent) {
    e.preventDefault(); // Don't navigate to viewer
    e.stopPropagation();
    runOcr(pdf.id);
    // Force a page refresh after a short delay to see status change
    setTimeout(() => window.location.reload(), 2000);
  }

  return (
    <Link
      href={`/dashboard/viewer/${pdf.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#DE3163] hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-gray-900 truncate">
        {pdf.display_name}
      </h3>
      <p className="text-sm text-gray-500 mt-1 truncate">{pdf.filename}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">
          {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
        </span>
        <div className="flex items-center gap-2">
          {(pdf.ocr_status === "pending" || pdf.ocr_status === "failed") && (
            <button
              onClick={handleRunOcr}
              className="text-xs text-[#DE3163] hover:underline"
            >
              Run OCR
            </button>
          )}
          <OcrStatusBadge status={pdf.ocr_status} />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {new Date(pdf.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
