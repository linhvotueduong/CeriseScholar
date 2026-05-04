import type { BetaWaitlistStatus } from "@/types/beta";

const signature = "The Cerise Scholar team";

export function waitlistReceivedEmail(email: string) {
  return {
    to: email,
    subject: "Cerise Scholar public beta waitlist",
    text: `Thank you for joining the Cerise Scholar public beta waitlist.

We are a small startup, and we truly appreciate your support.

We will review your request and email you about beta access within 3-4 business days.

If we cannot invite you right now, we still hope to welcome you in a future cohort as Cerise Scholar scales.

Thank you for believing in us and in your scientific journey.

${signature}`,
  };
}

export function waitlistDecisionEmail(email: string, status: BetaWaitlistStatus) {
  if (status === "approved") {
    return {
      to: email,
      subject: "You are approved for Cerise Scholar public beta",
      text: `Good news — you are approved for the Cerise Scholar public beta.

You can now sign in and begin using your research workspace.

Thank you for believing in us and in your scientific journey.

${signature}`,
    };
  }

  if (status === "future_cohort") {
    return {
      to: email,
      subject: "Cerise Scholar public beta update",
      text: `Thank you for joining the Cerise Scholar public beta waitlist.

We cannot invite you into this beta cohort right now, but we still hope to welcome you in a future cohort as Cerise Scholar scales.

Thank you for believing in us and in your scientific journey.

${signature}`,
    };
  }

  return waitlistReceivedEmail(email);
}
