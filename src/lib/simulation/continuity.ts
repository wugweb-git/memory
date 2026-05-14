export function continuityHealth(openLoops: number, activeThreads: number) {
  const score = Math.max(0, 1 - openLoops / Math.max(1, activeThreads * 3));
  return Number(score.toFixed(3));
}
