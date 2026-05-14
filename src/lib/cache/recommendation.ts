const recommendationCache = new Map<string, { value: unknown; expiresAt: number }>();
export const getRecommendationCache = <T,>(key: string) => {
  const i = recommendationCache.get(key);
  return i && i.expiresAt > Date.now() ? (i.value as T) : null;
};
export const setRecommendationCache = (key: string, value: unknown, ttlMs = 45_000) => recommendationCache.set(key, { value, expiresAt: Date.now() + ttlMs });
