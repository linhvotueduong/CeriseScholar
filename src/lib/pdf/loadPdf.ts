import * as pdfjs from "pdfjs-dist";

// Point PDF.js to the worker file we copied into the public folder
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

/**
 * Loads a PDF document from a URL and returns the PDF.js document object.
 * The document object lets you access individual pages.
 */
export async function loadPdf(url: string) {
  const doc = await pdfjs.getDocument(url).promise;
  return doc;
}

export type PDFDocumentProxy = Awaited<ReturnType<typeof loadPdf>>;
