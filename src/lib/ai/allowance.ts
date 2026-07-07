// Phase 2 usage-metering constants + pure helpers (docs/architecture-pivot-roadmap.md
// Phase 2). Client-safe: no server-only imports, so both API routes and
// client components (e.g. a usage meter in Settings → AI) can share the same
// allowance number and math instead of hardcoding it in two places.

// Read from NEXT_PUBLIC_* so the same value is visible to both server routes
// (enforcement) and the client (displaying "N included requests/month").
export const INCLUDED_MONTHLY_ALLOWANCE = Number(
  process.env.NEXT_PUBLIC_INCLUDED_MONTHLY_ALLOWANCE ?? 150
);

/**
 * Start of the UTC calendar month containing `now`, as an ISO string —
 * the boundary used to count "this month's" default-lane usage.
 */
export function monthStartUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

/**
 * True once `used` has reached (or passed) the allowance — i.e. the next
 * request should be blocked. Defaults to the shared included allowance when
 * a caller doesn't have a more specific number to check against.
 */
export function allowanceExceeded(used: number, allowance: number = INCLUDED_MONTHLY_ALLOWANCE): boolean {
  return used >= allowance;
}
