"use client";

import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import type { Pdf } from "@/types/pdf";

export default function PdfCard({ pdf }: { pdf: Pdf }) {
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
        {pdf.ocr_status === "processing" && (
          <div className="flex items-center gap-1.5">
            <Spinner size="sm" />
            <span className="text-xs text-blue-600">Processing...</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {new Date(pdf.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
