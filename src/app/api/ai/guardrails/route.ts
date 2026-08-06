import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAiUsageGuardrails,
  getGuardrailUsageSnapshot,
  saveAiUsageGuardrails,
} from "@/lib/server/aiGuardrails";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [guardrails, usage] = await Promise.all([
      getAiUsageGuardrails(supabase, user.id),
      getGuardrailUsageSnapshot(supabase, user.id, new Date()),
    ]);

    return NextResponse.json({ guardrails, usage });
  } catch (err) {
    console.error("AI guardrails status error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Guardrail settings are required." }, { status: 400 });
    }

    const guardrails = await saveAiUsageGuardrails(supabase, user.id, body);
    const usage = await getGuardrailUsageSnapshot(supabase, user.id, new Date());

    return NextResponse.json({ guardrails, usage });
  } catch (err) {
    console.error("AI guardrails save error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Saving guardrails failed. Please try again." }, { status: 500 });
  }
}
