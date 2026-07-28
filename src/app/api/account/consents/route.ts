import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { persistSignupConsents } from "@/lib/legal/persistConsents";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await persistSignupConsents(supabase, user);
  if (result.error) {
    console.error("Signup consent persistence failed", { userId: user.id, message: result.error });
    return NextResponse.json({ error: "Consent record could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
