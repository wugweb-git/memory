export function detectTimingWindow(urgency: number, readiness: number) {
  return urgency > 0.6 && readiness > 0.6;
}
