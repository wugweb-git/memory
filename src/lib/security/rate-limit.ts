const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const item = hits.get(key);
  if (!item || item.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  item.count += 1;
  if (item.count > limit) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: Math.max(0, limit - item.count) };
}
