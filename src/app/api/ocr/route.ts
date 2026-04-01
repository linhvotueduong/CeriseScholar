import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export const maxDuration = 300;

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
  try {
    const { pdfId } = await request.json();
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

    // Load the PDF with PDF.js (server-side legacy build)
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
    const pageCount = doc.numPages;
    const allPageTexts: string[] = [];

    // Check which pages need OCR (scanned) vs have embedded text
    const { createWorker } = await import("tesseract.js");
    const { createCanvas } = await import("canvas");

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
              ocrWorker = await createWorker("eng");
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

    try {
      const body = await request.clone().json();
      if (body.pdfId) {
        const supabase = await getSupabase();
        await supabase.from("pdfs").update({ ocr_status: "failed" }).eq("id", body.pdfId);
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}
