"use client";

import PdfViewer from "@/components/pdf/PdfViewer";

interface ViewerClientProps {
  pdfId: string;
  pdfName: string;
  pdfUrl: string;
  pdfAuthor?: string;
  pdfTitle?: string;
}

export default function ViewerClient({ pdfId, pdfName, pdfUrl, pdfAuthor, pdfTitle }: ViewerClientProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex-1 overflow-hidden">
        <PdfViewer
          url={pdfUrl}
          pdfId={pdfId}
          pdfDisplayName={pdfName}
          pdfAuthor={pdfAuthor}
          pdfTitle={pdfTitle}
        />
      </div>
    </div>
  );
}
