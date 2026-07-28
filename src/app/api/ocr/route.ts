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

/**
 * OCR jobs run through a QUEUE, not a quota: heavy image-recognition work is
 * processed one job at a time per server so simultaneous uploads can never choke
 * the shared server — every job still runs, just in order. The only remaining
 * rate limit is a generous daily ABUSE BRAKE (bots/runaway scripts), which no
 * human researcher should ever hit.
 */
const OCR_DAILY_ABUSE_BRAKE = 100;
let ocrQueueTail: Promise<unknown> = Promise.resolve();

function enqueueOcr<T>(job: () => Promise<T>): Promise<T> {
  const next = ocrQueueTail.then(job, job);
  ocrQueueTail = next.catch(() => undefined);
  return next;
}

type OcrEngine = {
  createCanvas: typeof import("canvas").createCanvas;
  createWorker: typeof import("tesseract.js").createWorker;
};

/**
 * The image-OCR machinery (native canvas + tesseract) can be unavailable in some
 * server environments. When it is, we DEGRADE instead of failing: embedded text
 * (which most academic PDFs carry) is still extracted and the document completes.
 */
async function loadOcrEngine(): Promise<OcrEngine | null> {
  try {
    const canvasMod = await import("canvas");
    const tesseractMod = await import("tesseract.js");
    if (typeof canvasMod.createCanvas !== "function" || typeof tesseractMod.createWorker !== "function") {
      return null;
    }
    return { createCanvas: canvasMod.createCanvas, createWorker: tesseractMod.createWorker };
  } catch (error) {
    console.warn("OCR engine unavailable — falling back to embedded-text extraction only:", error);
    return null;
  }
}

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

type SupabaseServer = Awaited<ReturnType<typeof getSupabase>>;

async function processPdf(
  supabase: SupabaseServer,
  storagePath: string,
  pdfId: string
) {
  await supabase.from("pdfs").update({ ocr_status: "processing" }).eq("id", pdfId);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("pdfs")
    .download(storagePath);

  if (downloadError || !fileData) {
    await supabase.from("pdfs").update({ ocr_status: "failed" }).eq("id", pdfId);
    throw new Error("Failed to download PDF from storage");
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const engine = await loadOcrEngine();

  let scannedPagesSkipped = 0;
  const allPageTexts: string[] = [];
  let realTextPages = 0;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const docParams: Record<string, unknown> = { data: uint8Array };
  if (engine) {
    const { createCanvas } = engine;
    // Force PDF.js to use node-canvas for its internal image canvases too;
    // otherwise scanned-image pages can mix canvas implementations and fail
    // before Tesseract gets an image.
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
    docParams.CanvasFactory = CanvasFactory;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await (pdfjs.getDocument as any)(docParams).promise;
  const pageCount = doc.numPages;

  // One reusable Tesseract worker for all scanned pages
  let ocrWorker: Awaited<ReturnType<OcrEngine["createWorker"]>> | null = null;

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str || "")
        .join(" ")
        .trim();

      if (pageText.length > 20) {
        // Page has embedded text — no OCR needed
        allPageTexts.push(pageText);
        realTextPages += 1;
      } else if (engine) {
        // Page might be scanned — use OCR
        try {
          if (!ocrWorker) {
            const tesseractCachePath = "/tmp/cerise-scholar-tesseract";
            const { mkdir } = await import("node:fs/promises");
            await mkdir(tesseractCachePath, { recursive: true });
            ocrWorker = await engine.createWorker("eng", undefined, {
              cachePath: tesseractCachePath,
            });
          }

          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = engine.createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext("2d");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page.render as any)({
            canvasContext: ctx,
            viewport,
          }).promise;

          const pngBuffer = canvas.toBuffer("image/png");
          const { data: { text } } = await ocrWorker.recognize(pngBuffer);

          allPageTexts.push(text.trim());
          if (text.trim().length > 0) realTextPages += 1;
        } catch (ocrError) {
          console.error(`OCR failed on page ${i}:`, ocrError);
          allPageTexts.push(`[OCR failed on page ${i}]`);
        }
      } else {
        scannedPagesSkipped += 1;
        allPageTexts.push(`[Scanned page ${i} — image OCR unavailable on this server]`);
      }
    }
  } finally {
    if (ocrWorker) {
      await ocrWorker.terminate();
    }
  }

  const fullText = allPageTexts.join("\n\n--- Page Break ---\n\n");

  // Honest completion: if ANY real text was recovered the document is usable and
  // completes (degraded scans are noted inline). "failed" is reserved for documents
  // where nothing readable could be recovered at all.
  const status = realTextPages > 0 ? "completed" : "failed";

  await supabase
    .from("pdfs")
    .update({
      ocr_status: status,
      ocr_text: fullText,
      page_count: pageCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pdfId);

  return {
    success: status === "completed",
    pageCount,
    textLength: fullText.length,
    ocrEngineAvailable: engine !== null,
    scannedPagesSkipped,
  };
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

    // Abuse brake only — never a usage quota. Real capacity is protected by the queue.
    if (!checkRateLimit(user.id, "ocr", OCR_DAILY_ABUSE_BRAKE, 86_400_000)) {
      return NextResponse.json(
        { error: "Daily OCR safety limit reached. It resets within 24 hours — if you hit this as a real user, please contact support." },
        { status: 429 }
      );
    }

    const { data: pdf, error: fetchError } = await supabase
      .from("pdfs")
      .select("id, storage_path")
      .eq("id", pdfId)
      .single();

    if (fetchError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const result = await enqueueOcr(() => processPdf(supabase, pdf.storage_path, pdfId!));
    return NextResponse.json(result);
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
