import * as pdfjs from "pdfjs-dist";

// Point PDF.js to the worker file in the public folder
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

/**
 * Loads a PDF document from a URL and returns the PDF.js document object.
 */
export async function loadPdf(url: string) {
  const doc = await pdfjs.getDocument(url).promise;
  return doc;
}

export type PDFDocumentProxy = Awaited<ReturnType<typeof loadPdf>>;
