export function clusterSignals<T extends { category?: string }>(signals: T[]) {
  return signals.reduce((acc: Record<string, T[]>, s) => {
    const k = s.category || "uncategorized";
    (acc[k] ||= []).push(s);
    return acc;
  }, {});
}
