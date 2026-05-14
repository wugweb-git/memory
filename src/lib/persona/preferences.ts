export function learnPreference(key: string, value: unknown, confidence = 0.6) {
  return { key, value, confidence, learnedAt: new Date().toISOString() };
}
