import { isAdminEmail } from "@/lib/admin/config";
import type { BetaWaitlistStatus } from "@/types/beta";

export { isAdminEmail };

export function isBetaWaitlistRequired() {
  return process.env.BETA_WAITLIST_REQUIRED !== "false";
}

export function isApprovedBetaStatus(status?: string | null): status is "approved" {
  return status === "approved";
}

export function isBetaWaitlistStatus(value: unknown): value is BetaWaitlistStatus {
  return value === "pending_review" || value === "approved" || value === "future_cohort";
}
