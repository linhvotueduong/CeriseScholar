import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const maxDuration = 300; // Allow up to 5 minutes for large PDFs

export async function POST(request: Request) {
  try {
    const { pdfId } = await request.json();
    if (!pdfId) {
      return NextResponse.json({ error: "pdfId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify user owns this PDF
    const { data: pdf, error: fetchError } = await supabase
      .from("pdfs")
      .select("*")
      .eq("id", pdfId)
      .single();

    if (fetchError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Update status to processing
    await supabase
      .from("pdfs")
      .update({ ocr_status: "processing" })
      .eq("id", pdfId);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdfs")
      .download(pdf.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from("pdfs")
        .update({ ocr_status: "failed" })
        .eq("id", pdfId);
      return NextResponse.json(
        { error: "Failed to download PDF" },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load the PDF with PDF.js
    const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
    const pageCount = doc.numPages;
    const allPageTexts: string[] = [];

    // Process each page
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();

      // Combine all text items on this page
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str || "")
        .join(" ")
        .trim();

      if (pageText.length > 20) {
        // Page has embedded text — use it directly, no OCR needed
        allPageTexts.push(pageText);
      } else {
        // Page has little or no text — likely a scanned image
        // For now, run Tesseract.js on this page
        try {
          const { createWorker } = await import("tesseract.js");
          const { createCanvas } = await import("canvas");

          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext("2d");

          // Render PDF page to canvas
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page.render as any)({
            canvasContext: ctx,
            viewport,
          }).promise;

          // Convert canvas to PNG buffer for Tesseract
          const pngBuffer = canvas.toBuffer("image/png");

          // Run OCR
          const worker = await createWorker("eng");
          const {
            data: { text },
          } = await worker.recognize(pngBuffer);
          await worker.terminate();

          allPageTexts.push(text.trim());
        } catch (ocrError) {
          console.error(`OCR failed on page ${i}:`, ocrError);
          allPageTexts.push(`[OCR failed on page ${i}]`);
        }
      }
    }

    const fullText = allPageTexts.join("\n\n--- Page Break ---\n\n");

    // Save the OCR result
    await supabase
      .from("pdfs")
      .update({
        ocr_status: "completed",
        ocr_text: fullText,
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pdfId);

    return NextResponse.json({
      success: true,
      pageCount,
      textLength: fullText.length,
    });
  } catch (error) {
    console.error("OCR route error:", error);

    // Try to mark as failed
    try {
      const { pdfId } = await request.clone().json();
      if (pdfId) {
        const supabase = await createClient();
        await supabase
          .from("pdfs")
          .update({ ocr_status: "failed" })
          .eq("id", pdfId);
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}
