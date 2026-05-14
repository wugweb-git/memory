export function scoreOpportunity(signal: number, fit: number, timing: number) {
  return Number((signal * 0.4 + fit * 0.4 + timing * 0.2).toFixed(3));
}
