export function rankOpportunities(items: Array<{ id: string; urgency: number; leverage: number; fit: number }>) {
  return [...items].sort((a, b) => (b.urgency + b.leverage + b.fit) - (a.urgency + a.leverage + a.fit));
}
