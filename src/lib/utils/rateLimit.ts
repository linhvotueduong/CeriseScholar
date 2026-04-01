/**
 * Simple in-memory rate limiter.
 * Tracks requests per user (by ID) within a sliding time window.
 * Automatically cleans up expired entries to prevent memory leaks.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 600_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

/**
 * Check if a request should be rate-limited.
 * @param userId - The user's ID
 * @param route - Route identifier (e.g., "ai", "research", "ocr")
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(
  userId: string,
  route: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = `${userId}:${route}`;
  const now = Date.now();

  const entry = store.get(key) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    return false; // Rate limited
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true; // Allowed
}
