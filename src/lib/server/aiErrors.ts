// Shared BYOK request-time failure mapping — see docs/byok-intake-design.md
// §2d. Lane resolution (src/lib/server/aiCredentials.ts) never silently falls
// back to the founder key; the routes that actually call OpenRouter use this
// helper to turn a declined BYOK key into one clear, actionable message
// instead of a generic upstream error.

/** OpenRouter statuses that mean "this key is no good" (revoked/out of credits). */
export function isByokDeclinedStatus(status: number): boolean {
  return status === 401 || status === 402;
}

export const BYOK_DECLINED_MESSAGE =
  "Your OpenRouter key was declined (out of credits or revoked). Fix or disconnect it in Settings → AI.";
