const outputCache = new Map<string, { value: unknown; expiresAt: number }>();
export const getOutputCache = <T,>(key: string) => {
  const i = outputCache.get(key);
  return i && i.expiresAt > Date.now() ? (i.value as T) : null;
};
export const setOutputCache = (key: string, value: unknown, ttlMs = 120_000) => outputCache.set(key, { value, expiresAt: Date.now() + ttlMs });
