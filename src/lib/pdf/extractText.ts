import type { PDFDocumentProxy } from "@/lib/pdf/loadPdf";

/**
 * Extracts all text content from a specific page of a PDF.
 */
export async function extractPageText(
  document: PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await document.getPage(pageNumber);
  const textContent = await page.getTextContent();

  return textContent.items
    .map((item: { str?: string }) => item.str || "")
    .join(" ")
    .trim();
}
