/**
 * Triggers server-side OCR processing for a PDF.
 * This is fire-and-forget — it doesn't wait for OCR to finish.
 * The upload page calls this after a successful upload.
 */
export async function runOcr(pdfId: string) {
  try {
    await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfId }),
    });
  } catch (error) {
    console.error("Failed to trigger OCR:", error);
  }
}
