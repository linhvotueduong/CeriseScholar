import { NextResponse } from "next/server";
import { isCeriseAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { authorized: isCeriseAdmin(user), supabase, user };
}

export async function GET() {
  const { authorized, supabase } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase.rpc("list_author_name_change_requests");
  if (error) {
    console.error("Admin name-change queue failed", { message: error.message });
    return NextResponse.json({ error: "The review queue could not be loaded." }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const { authorized, supabase } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { requestId?: unknown; decision?: unknown; reviewNote?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim().slice(0, 1000) : "";
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !decision) {
    return NextResponse.json({ error: "Choose a valid request and decision." }, { status: 400 });
  }
  if (decision === "rejected" && reviewNote.length < 10) {
    return NextResponse.json({ error: "Add a short explanation before rejecting." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("review_author_name_change", {
    target_request_id: requestId,
    review_decision: decision,
    reviewer_note: reviewNote || null,
  });

  if (error) {
    console.error("Admin name-change review failed", { requestId, message: error.message });
    return NextResponse.json({ error: "This request could not be reviewed." }, { status: 500 });
  }

  const reviewed = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ request: reviewed });
}
