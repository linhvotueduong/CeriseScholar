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
    .filter((item): item is { str: string } => "str" in item)
    .map((item) => item.str)
    .join(" ")
    .trim();
}
