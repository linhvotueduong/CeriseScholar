import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getBetaAccessForUser } from "@/lib/beta/server";
import { isApprovedBetaStatus } from "@/lib/beta/config";

export async function rejectIfBetaAccessMissing(supabase: SupabaseClient, user: User) {
  const access = await getBetaAccessForUser(supabase, user);
  if (access.error) {
    return NextResponse.json(
      {
        error: "Cerise Scholar beta access could not be verified.",
        betaAccessRequired: true,
        redirectTo: "/waitlist/status",
      },
      { status: 403 },
    );
  }
  if (access.status === "admin_approved" || access.status === "not_required" || isApprovedBetaStatus(access.status)) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Cerise Scholar beta access is pending review.",
      betaAccessRequired: true,
      redirectTo: "/waitlist/status",
      status: access.status,
    },
    { status: 403 },
  );
}
