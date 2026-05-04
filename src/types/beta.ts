export type BetaWaitlistStatus = "pending_review" | "approved" | "future_cohort";
export type BetaSignupMethod = "email" | "google" | "unknown";

export interface BetaWaitlistApplication {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  status: BetaWaitlistStatus;
  signup_method: BetaSignupMethod;
  admin_notes: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  waitlist_email_sent_at: string | null;
  approval_email_sent_at: string | null;
  future_cohort_email_sent_at: string | null;
}

export const betaWaitlistStatusLabels: Record<BetaWaitlistStatus, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  future_cohort: "Future Cohort",
};
