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
  projectName?: string;
  projectColor?: string;
}

export default function ViewerClient({ projectId, pdfId, pdfName, pdfUrl, pdfAuthor, pdfTitle, projectName, projectColor }: ViewerClientProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-2">
        <Link
          href={`/dashboard/project/${projectId}`}
          className="text-sm text-gray-500 hover:text-[#111111] transition-colors"
        >
          &larr; Projects
        </Link>
        {projectName && (
          <>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: projectColor }} />
            <h2 className="text-sm font-medium text-gray-800 truncate">{projectName}</h2>
            <span className="text-gray-300">/</span>
          </>
        )}
        <span className="text-sm text-gray-600 truncate">{pdfName}</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href={`/dashboard/project/${projectId}/scholar-ask`} className="text-xs text-[#111111] hover:underline font-medium">ScholarAsk</Link>
          <Link href={`/dashboard/project/${projectId}/meta-analysis`} className="text-xs text-[#111111] hover:underline font-medium">Meta-Analysis</Link>
          <Link href={`/dashboard/project/${projectId}/literature-review`} className="text-xs text-[#111111] hover:underline font-medium">Lit Review</Link>
          <Link href={`/dashboard/project/${projectId}/paper-writer`} className="text-xs text-[#111111] hover:underline font-medium">Paper Writer &rarr;</Link>
        </div>
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
