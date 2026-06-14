const HOSTED_AI_BYPASS_EMAILS = new Set(["linhvotueduong@gmail.com"]);

export function canUseHostedAiBypass(email?: string | null) {
  return Boolean(email && HOSTED_AI_BYPASS_EMAILS.has(email.trim().toLowerCase()));
}

export const HOSTED_AI_BYPASS_DETAIL =
  "Hosted AI agents are enabled for this beta account, so local setup is not required.";
