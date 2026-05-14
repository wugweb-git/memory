export function detectPersonaDrift(baseline: number, latest: number, threshold = 0.2) {
  const delta = Math.abs(latest - baseline);
  return { drifted: delta >= threshold, delta: Number(delta.toFixed(3)) };
}
