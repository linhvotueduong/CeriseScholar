import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { analyzePdfForEvidence } from "@/lib/server/evidenceAnalysis";

// Powers the Evidence Library card/subpage's "Retry" button — re-runs the
// upload-analysis pipeline (src/lib/server/evidenceAnalysis.ts) for a PDF
// the user already owns, either because the first pass failed or because
// they just want a fresh pass. Same auth pattern as /api/ai and /api/ocr.

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

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!checkRateLimit(user.id, "evidence_analyze", 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const pdfId = typeof body?.pdfId === "string" ? body.pdfId : null;
    if (!pdfId) {
      return NextResponse.json({ error: "pdfId is required" }, { status: 400 });
    }

    // `.eq("user_id", ...)` here is belt-and-suspenders alongside RLS (pdfs is
    // owner-scoped) — either way, someone else's pdfId simply resolves to no
    // row, which we report as a plain 404 rather than leaking whether it exists.
    const { data: pdf, error: fetchError } = await supabase
      .from("pdfs")
      .select("id, project_id, display_name, pdf_title, ocr_text")
      .eq("id", pdfId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !pdf) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    if (!pdf.ocr_text || !pdf.ocr_text.trim()) {
      return NextResponse.json(
        { error: "This source doesn't have extracted text yet — wait for processing to finish, then retry." },
        { status: 400 }
      );
    }

    const title = (pdf.pdf_title && pdf.pdf_title.trim()) || pdf.display_name;

    // analyzePdfForEvidence never throws — it always resolves after writing a
    // 'ready' or 'failed' row, so awaiting it here is safe.
    await analyzePdfForEvidence(supabase, {
      userId: user.id,
      projectId: pdf.project_id ?? null,
      pdfId: pdf.id,
      title,
      text: pdf.ocr_text,
    });

    const { data: row } = await supabase
      .from("evidence_library")
      .select("id, status, doc_type, evidence, caveat")
      .eq("user_id", user.id)
      .eq("pdf_id", pdf.id)
      .maybeSingle();

    return NextResponse.json({ ok: true, row: row ?? null });
  } catch (err) {
    console.error("Evidence analyze route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
