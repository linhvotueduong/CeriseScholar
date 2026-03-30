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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item: any) => item.str || "")
    .join(" ")
    .trim();
}
