// GET /api/ai/usage — read-only usage-meter endpoint (Phase 2,
// docs/architecture-pivot-roadmap.md Phase 2). Lets Settings → AI (and any
// other client surface) show "N of 150 included requests used this month"
// without duplicating the allowance/lane logic that already lives server-side.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAiCredentials } from "@/lib/server/aiCredentials";
import { getMonthlyDefaultLaneUsage, getMonthlyTotalUsage } from "@/lib/server/aiUsage";
import { INCLUDED_MONTHLY_ALLOWANCE } from "@/lib/ai/allowance";

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

    const credentials = await resolveAiCredentials(user.id, supabase);
    const now = new Date();
    const [used, usedThisMonthTotal] = await Promise.all([
      getMonthlyDefaultLaneUsage(supabase, user.id, now),
      getMonthlyTotalUsage(supabase, user.id, now),
    ]);

    return NextResponse.json({
      lane: credentials.lane,
      used,
      usedThisMonthTotal,
      allowance: credentials.lane === "default" ? INCLUDED_MONTHLY_ALLOWANCE : null,
    });
  } catch (err) {
    console.error("AI usage route error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
