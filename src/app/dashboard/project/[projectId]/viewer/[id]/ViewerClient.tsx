"use client";

import PdfViewer from "@/components/pdf/PdfViewer";
import Link from "next/link";

interface ViewerClientProps {
  projectId: string;
  pdfId: string;
  pdfName: string;
  pdfUrl: string;
  pdfAuthor?: string;
  pdfTitle?: string;
}

export default function ViewerClient({ projectId, pdfId, pdfName, pdfUrl, pdfAuthor, pdfTitle }: ViewerClientProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-2">
        <Link
          href={`/dashboard/project/${projectId}`}
          className="text-sm text-gray-500 hover:text-[#DE3163] transition-colors"
        >
          &larr; Back
        </Link>
        <h2 className="text-sm font-medium text-gray-800 truncate">
          {pdfName}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <PdfViewer
          url={pdfUrl}
          pdfId={pdfId}
          pdfDisplayName={pdfName}
          pdfAuthor={pdfAuthor}
          pdfTitle={pdfTitle}
          projectId={projectId}
        />
      </div>
    </div>
  );
}
