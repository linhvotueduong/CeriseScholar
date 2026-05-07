import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export const maxDuration = 300;
export const runtime = "nodejs";

type CanvasFactoryEntry = {
  canvas: {
    width: number;
    height: number;
    getContext: (contextId: "2d") => unknown;
  };
  context: unknown;
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore — cookies can't be set in API routes after streaming starts
          }
        },
      },
    }
  );
}

export async function POST(request: Request) {
  let pdfId: string | undefined;

  try {
    ({ pdfId } = await request.json());
    if (!pdfId) {
      return NextResponse.json({ error: "pdfId is required" }, { status: 400 });
    }

    const supabase = await getSupabase();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 5 OCR requests per hour per user
    if (!checkRateLimit(user.id, "ocr", 5, 3_600_000)) {
      return NextResponse.json({ error: "Too many OCR requests. Please wait before processing more PDFs." }, { status: 429 });
    }

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
      await supabase.from("pdfs").update({ ocr_status: "failed" }).eq("id", pdfId);
      return NextResponse.json({ error: "Failed to download PDF" }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check which pages need OCR (scanned) vs have embedded text
    const { mkdir } = await import("node:fs/promises");
    const { createWorker } = await import("tesseract.js");
    const { createCanvas } = await import("canvas");
    const tesseractCachePath = "/tmp/cerise-scholar-tesseract";
    await mkdir(tesseractCachePath, { recursive: true });

    class CanvasFactory {
      create(width: number, height: number): CanvasFactoryEntry {
        const canvas = createCanvas(width, height);
        return { canvas, context: canvas.getContext("2d") };
      }

      reset(canvasAndContext: CanvasFactoryEntry, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
      }

      destroy(canvasAndContext: CanvasFactoryEntry) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
      }
    }

    // Load the PDF with PDF.js. Force PDF.js to use node-canvas for its
    // internal image canvases too; otherwise scanned-image pages can mix
    // canvas implementations and fail before Tesseract gets an image.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await (pdfjs.getDocument as any)({
      data: uint8Array,
      CanvasFactory,
    }).promise;
    const pageCount = doc.numPages;
    const allPageTexts: string[] = [];

    // Create ONE reusable Tesseract worker for all scanned pages
    let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ")
          .trim();

        if (pageText.length > 20) {
          // Page has embedded text — no OCR needed
          allPageTexts.push(pageText);
        } else {
          // Page might be scanned — use OCR
          try {
            // Lazily create worker on first scanned page, reuse for the rest
            if (!ocrWorker) {
              ocrWorker = await createWorker("eng", undefined, {
                cachePath: tesseractCachePath,
              });
            }

            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext("2d");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (page.render as any)({
              canvasContext: ctx,
              viewport,
            }).promise;

            const pngBuffer = canvas.toBuffer("image/png");
            const { data: { text } } = await ocrWorker.recognize(pngBuffer);

            allPageTexts.push(text.trim());
          } catch (ocrError) {
            console.error(`OCR failed on page ${i}:`, ocrError);
            allPageTexts.push(`[OCR failed on page ${i}]`);
          }
        }
      }
    } finally {
      // Always clean up the worker, even if an error occurs
      if (ocrWorker) {
        await ocrWorker.terminate();
      }
    }

    const fullText = allPageTexts.join("\n\n--- Page Break ---\n\n");

    // Save the result
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

    if (pdfId) {
      try {
        const supabase = await getSupabase();
        await supabase.from("pdfs").update({ ocr_status: "failed" }).eq("id", pdfId);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      {
        error: "OCR processing failed",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
