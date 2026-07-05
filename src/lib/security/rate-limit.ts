import { postgres } from "@/lib/db/postgres";

/**
 * Distributed rate limiter — counters live in Neon (rate_limit_counters),
 * not in-process memory. A serverless cold start or a request landing on a
 * different instance previously reset the in-memory Map, making the old
 * limiter a no-op in production. The single INSERT ... ON CONFLICT below is
 * atomic under Postgres row-level locking, so concurrent hits for the same
 * key serialize correctly.
 *
 * Fails OPEN on DB error (rate-limiting is a secondary abuse mitigation;
 * the primary auth guard on each route still applies).
 */
export async function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): Promise<{ allowed: boolean; remaining: number }> {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await postgres.$queryRaw<Array<{ count: number }>>`
      INSERT INTO rate_limit_counters (key, count, "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit_counters."resetAt" < now() THEN 1 ELSE rate_limit_counters.count + 1 END,
        "resetAt" = CASE WHEN rate_limit_counters."resetAt" < now() THEN ${resetAt} ELSE rate_limit_counters."resetAt" END
      RETURNING count
    `;
    const row = rows[0];
    if (!row) return { allowed: true, remaining: limit - 1 };
    if (row.count > limit) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: Math.max(0, limit - row.count) };
  } catch (err) {
    console.error("[RateLimit] Neon counter unavailable — failing open:", err);
    return { allowed: true, remaining: limit };
  }
}
