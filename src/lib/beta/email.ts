import { waitlistDecisionEmail, waitlistReceivedEmail } from "@/lib/beta/emailTemplates";
import type { BetaWaitlistStatus } from "@/types/beta";

export function isBetaEmailSendingEnabled() {
  return process.env.EMAIL_SENDING_ENABLED === "true";
}

export async function sendWaitlistReceivedEmail(email: string) {
  const template = waitlistReceivedEmail(email);

  return {
    sent: false,
    disabled: !isBetaEmailSendingEnabled(),
    template,
  };
}

export async function sendWaitlistDecisionEmail(email: string, status: BetaWaitlistStatus) {
  const template = waitlistDecisionEmail(email, status);

  return {
    sent: false,
    disabled: !isBetaEmailSendingEnabled(),
    template,
  };
}
