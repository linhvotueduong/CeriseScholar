import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

/**
 * Extracts metadata (title, author, subject) from a PDF file.
 * Returns whatever the PDF has embedded — many PDFs have this info.
 */
export async function extractPdfMetadata(file: File): Promise<{
  title: string;
  author: string;
  subject: string;
  pageCount: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const metadata = await doc.getMetadata();

  const info = metadata.info as Record<string, string | undefined> | undefined;

  return {
    title: info?.Title || "",
    author: info?.Author || "",
    subject: info?.Subject || "",
    pageCount: doc.numPages,
  };
}
