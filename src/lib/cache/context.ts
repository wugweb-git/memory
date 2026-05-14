const contextCache = new Map<string, { value: unknown; expiresAt: number }>();

export function getContextCache<T>(key: string): T | null {
  const item = contextCache.get(key);
  if (!item || item.expiresAt < Date.now()) return null;
  return item.value as T;
}

export function setContextCache(key: string, value: unknown, ttlMs = 30_000) {
  contextCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
