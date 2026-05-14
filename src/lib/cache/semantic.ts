const semanticCache = new Map<string, { value: unknown; expiresAt: number }>();
export const getSemanticCache = <T,>(key: string) => {
  const i = semanticCache.get(key);
  return i && i.expiresAt > Date.now() ? (i.value as T) : null;
};
export const setSemanticCache = (key: string, value: unknown, ttlMs = 60_000) => semanticCache.set(key, { value, expiresAt: Date.now() + ttlMs });
