// Use the webpack-specific entry point — it auto-configures the worker
// and avoids the "Object.defineProperty called on non-object" error
import { getDocument } from "pdfjs-dist/webpack.mjs";

/**
 * Loads a PDF document from a URL and returns the PDF.js document object.
 * The document object lets you access individual pages.
 */
export async function loadPdf(url: string) {
  const doc = await getDocument(url).promise;
  return doc;
}

export type PDFDocumentProxy = Awaited<ReturnType<typeof loadPdf>>;
