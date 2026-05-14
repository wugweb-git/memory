export function prioritizeActions(actions: Array<{ id: string; urgency: number; leverage: number }>) {
  return [...actions].sort((a, b) => b.urgency + b.leverage - (a.urgency + a.leverage));
}
