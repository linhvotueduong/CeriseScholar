"use client";

import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import type { Pdf } from "@/types/pdf";

export default function PdfCard({ pdf }: { pdf: Pdf }) {
  return (
    <Link
      href={`/dashboard/viewer/${pdf.id}`}
      className="block bg-white rounded-xl border border-[#e0d8d0] p-5 hover:border-[#1a1208] hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-[#1a1208] truncate">
        {pdf.display_name}
      </h3>
      <p className="text-sm text-[#7a6a5a] mt-1 truncate">{pdf.filename}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[#9a8a7a]">
          {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
        </span>
        {pdf.ocr_status === "processing" && (
          <div className="flex items-center gap-1.5">
            <Spinner size="sm" />
            <span className="text-xs text-blue-600">Processing...</span>
          </div>
        )}
        {pdf.ocr_status === "failed" && (
          <span className="text-xs text-red-500">OCR failed</span>
        )}
      </div>
      <p className="text-xs text-[#9a8a7a] mt-2">
        {new Date(pdf.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
