export function evolveTopicScore(current: number, signal: number, momentum = 0.2) {
  return Math.max(0, Math.min(1, current + (signal - current) * momentum));
}
