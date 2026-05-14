export function withinBudget(spent: number, limit: number) {
  return { allowed: spent <= limit, remaining: Number((limit - spent).toFixed(4)) };
}
