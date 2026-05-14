export function scoreSignalTemporalWeight(recencyHours: number, base = 0.5) {
  const decay = Math.max(0.1, 1 - recencyHours / 168);
  return Number((base * decay).toFixed(3));
}
