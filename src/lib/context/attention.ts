export function attentionPriority(urgency: number, importance: number, fatigue: number) {
  return Number((urgency * 0.4 + importance * 0.4 - fatigue * 0.2).toFixed(3));
}
