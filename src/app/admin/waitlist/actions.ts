"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin/auth";
import { isBetaWaitlistStatus } from "@/lib/beta/config";

export async function updateWaitlistApplication(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const adminNotes = String(formData.get("admin_notes") || "");

  if (!id || !isBetaWaitlistStatus(status)) {
    return;
  }

  const { supabase, user } = await requireAdminUser();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("beta_waitlist_applications")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("beta_waitlist_applications")
    .update({
      status,
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: status === "pending_review" ? null : now,
      updated_at: now,
    })
    .eq("id", id);

  if (!error) {
    await supabase.from("beta_waitlist_activity_events").insert({
      application_id: id,
      actor_user_id: user.id,
      event_type: existing?.status === status ? "admin_notes_updated" : "status_changed",
      details: {
        from: existing?.status ?? null,
        to: status,
      },
    });
  }

  revalidatePath("/admin/waitlist");
}
